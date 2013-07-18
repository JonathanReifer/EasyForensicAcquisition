#!/usr/bin/perl


use Env qw(THEDEV);

my $evidenceMediaPath;
my $writeableMediaPath;

# udevadm test --action=add `udevadm info -q path -n /dev/sdb1` | xsel

#  udevadm info -q path -n /dev/sdb
#  /devices/pci0000:00/0000:00:1d.7/usb1/1-5/1-5:1.0/host15/target15:0:0/15:0:0:0/block/sdb
#  blkid /dev/sdb1
#  /dev/sdb1: LABEL="USB20FD" UUID="3433-3231" TYPE="vfat"

my $devicePath;
my $device;

my $deviceType;
my $deviceName;
my $mountName;

if ( defined($THEDEV) ) {
	$device = '/dev/'.$THEDEV;
} elsif ( $ARGV[0] ) {
	$device = '/dev/'.$ARGV[0];
}

`echo "$device" >/tmp/test.txt`;

if ( defined($device) ) {
#if( $ARGV[0] ) {
#	$device = $ARGV[0];
	$devicePath = `/sbin/udevadm info -q path -n $device`;

	#print "DEVICE=".$device."\n";
	#print "DEVICE_PATH=".$devicePath."\n";

	if($device =~ /^\/dev\/sd/ ) {
		$deviceType = "USB";
	} else {
		$deviceType = "OPTICAL";
	}

	my $output1 = `/sbin/blkid $device`;
	if( $output1 =~ /LABEL="(\w+)"/) {
		$deviceName = $1;
	} else {
		$deviceName = "UNKNOWN";
	}
	$mountName = $deviceType."_".$deviceName;
#	print "MOUNT NAME=".$mountName."\n";

	if($deviceName eq "UNKNOWN") {
		exit(-1);
	}	

	if( ! -d "/dev/evidenceDev" ) {
		`mkdir /dev/evidenceDev`;
	}
	if( ! -d "/dev/evidenceDevPart") {
		`mkdir /dev/evidenceDevPart`;
	}
	if( ! -d "/dev/writeableDev" ) {
		`mkdir /dev/writeableDev`;
	}
	if( ! -d "/dev/writeableDevPart") {
		`mkdir /dev/writeableDevPart`;
	}

`echo "$mountName" >/tmp/test2.txt`;

#### EVIDENCE MEDIA
if( $deviceType eq 'OPTICAL' ||  $devicePath =~ /usb1\/1-5/ ) {
#	`/bin/mkdir /evidenceMedia/$mountName`;
#	`/bin/mount -r -o uid=compadmin $device /evidenceMedia/$mountName`;
#	`ln -s /$device /dev/evidenceDevPart/$mountName`;

	print "evidenceDevPart/$mountName";

### WRITEABLE MEDIA
} else {
#	`/bin/mkdir /writeableMedia/$mountName`;
#	`chmod a+w /writeableMeida/$mountName`;
#	`/bin/mount -o uid=compadmin $device /writeableMedia/$mountName`;
	
#	`ln -s /$device /dev/writeableDevPart/$mountName`;
	print "writeableDevPart/$mountName";
}
	

}


exit(0);

