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

$device = '/dev/'.$THEDEV;

`echo "$device" >/tmp/test.txt`;

if ( defined($device) ) {
#if( $ARGV[0] ) {
#	$device = $ARGV[0];
	$devicePath = `/sbin/udevadm info -q path -n $device`;

	print "DEVICE=".$device."\n";
	print "DEVICE_PATH=".$devicePath."\n";

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
	print "MOUNT NAME=".$mountName."\n";

	if($deviceName eq "UNKNOWN") {
		exit(-1);
	}	

if( $deviceType eq 'OPTICAL' ||  $devicePath =~ /usb1\/1-5/ ) {
	`/bin/mkdir /evidenceMedia/$mountName`;
	`/bin/mount -r $device /evidenceMedia/$mountName`;
} else {
	`/bin/mkdir /writeableMedia/$mountName`;
	`/bin/mount $device /writeableMedia/$mountName`;
}
	

}


exit(0);

