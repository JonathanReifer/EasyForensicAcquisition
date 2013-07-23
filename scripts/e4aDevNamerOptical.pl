#!/usr/bin/perl


use Env qw(THEDEV);
use Env qw(ID_FS_LABEL);

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

if ( defined($ID_FS_LABEL) ) {
	$deviceName = $ID_FS_LABEL;
} else {
	$deviceName = 'UNKNOWN';
}

if ( defined($THEDEV) ) {
	$device = '/dev/'.$THEDEV;
} elsif ( $ARGV[0] ) {
	$device = '/dev/'.$ARGV[0];
}

`echo "$deviceName" >/tmp/test3.txt`;

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

	##### IF CD/DVD DETECT IF BLANK ####
	##### /lib/udev/cdrom_id --lock-media /dev/sr1
`/lib/udev/cdrom_id --lock-media $device`;

#	if ( $device == '/dev/sr1' ) {
#	my $disc_details = `/lib/udev/cdrom_id --lock-media /dev/sr1`
#	my @disc_detailsArr = split('\n', $disc_details);
#	foreach( @disc_detailsArr) {
#		if( $_ =~ /ID_CDROM_MEDIA=1/ ) {
#		$deviceName = $1;
#		}
#	}

#	my $output1 = `/sbin/blkid $device`;
#	if( $output1 =~ /LABEL="(\w+)"/) {
#		$deviceName = $1;
#	} else {
#		$deviceName = "UNKNOWN";
#	}

#$deviceName = "OPT";
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
#if( $deviceType eq 'OPTICAL' ||  $devicePath =~ /usb1\/1-5/ ) {
#if( $deviceType eq 'OPTICAL' ||  $devicePath =~ /usb2\/2-1/ ) {
if( $devicePath =~ /target0:0:1/ ||  $devicePath =~ /usb2\/2-1/ ) {
#	`/bin/mkdir /evidenceMedia/$mountName`;
#	`/bin/mount -r -o uid=compadmin $device /evidenceMedia/$mountName`;
#	`ln -s /$device /dev/evidenceDevPart/$mountName`;

	print "evidenceDevPart/$mountName";

### WRITEABLE MEDIA
#} else {
} elsif( $devicePath =~ /target1:0:1/ ||  $devicePath =~ /usb1\/1-1/ ) {
#	`/bin/mkdir /writeableMedia/$mountName`;
#	`chmod a+w /writeableMeida/$mountName`;
#	`/bin/mount -o uid=compadmin $device /writeableMedia/$mountName`;
	
#	`ln -s /$device /dev/writeableDevPart/$mountName`;
	print "writeableDevPart/$mountName";
}
	

}


exit(0);

